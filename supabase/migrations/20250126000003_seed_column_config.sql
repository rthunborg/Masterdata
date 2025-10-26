-- Seed Column Configurations
-- Migration: 20250126000003_seed_column_config.sql
-- Description: Insert initial masterdata column configurations

-- Insert masterdata column configurations
INSERT INTO public.column_config (column_name, column_type, is_masterdata, role_permissions) VALUES
  ('First Name', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  ('Surname', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  ('SSN', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": false, "edit": false},
    "omc": {"view": false, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": false, "edit": false}
  }'),
  ('Email', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  ('Mobile', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": false, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  ('Rank', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  ('Gender', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": false, "edit": false},
    "omc": {"view": false, "edit": false},
    "payroll": {"view": false, "edit": false},
    "toplux": {"view": false, "edit": false}
  }'),
  ('Town District', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": false, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  ('Hire Date', 'date', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  ('Status', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }')
ON CONFLICT DO NOTHING;
