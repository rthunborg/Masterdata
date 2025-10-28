-- Migration: Seed Column Configuration Data
-- Description: Populates column_config table with masterdata column definitions and initial role permissions
-- Created: 2025-10-28

-- Insert masterdata column configurations with role-based permissions
-- This script is idempotent - can be run multiple times without creating duplicates

-- Note: Permission Rationale
-- - Commonly Shared Columns (Name, Email, Mobile, Rank, Town District, Hire Date, Status): 
--   All external parties can view to coordinate work
-- - Sensitive Columns (SSN, Gender, Termination Date, Termination Reason, Comments): 
--   Restricted to HR Admin only for privacy
-- - Payroll Exception: Payroll can view SSN (needed for tax reporting) but not Mobile

INSERT INTO public.column_config (column_name, column_type, is_masterdata, role_permissions) VALUES
  -- First Name - Shared with all parties
  ('First Name', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  
  -- Surname - Shared with all parties
  ('Surname', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  
  -- SSN - Restricted: HR Admin and Payroll only (tax reporting)
  ('SSN', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": false, "edit": false},
    "omc": {"view": false, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": false, "edit": false}
  }'),
  
  -- Email - Shared with all parties
  ('Email', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  
  -- Mobile - Shared with most parties (not Payroll)
  ('Mobile', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": false, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  
  -- Rank - Shared with all parties
  ('Rank', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  
  -- Gender - Restricted: HR Admin only (privacy concerns)
  ('Gender', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": false, "edit": false},
    "omc": {"view": false, "edit": false},
    "payroll": {"view": false, "edit": false},
    "toplux": {"view": false, "edit": false}
  }'),
  
  -- Town District - Shared with most parties (not Payroll)
  ('Town District', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": false, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  
  -- Hire Date - Shared with all parties
  ('Hire Date', 'date', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  
  -- Termination Date - Restricted: HR Admin only (privacy concerns)
  ('Termination Date', 'date', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": false, "edit": false},
    "omc": {"view": false, "edit": false},
    "payroll": {"view": false, "edit": false},
    "toplux": {"view": false, "edit": false}
  }'),
  
  -- Termination Reason - Restricted: HR Admin only (privacy concerns)
  ('Termination Reason', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": false, "edit": false},
    "omc": {"view": false, "edit": false},
    "payroll": {"view": false, "edit": false},
    "toplux": {"view": false, "edit": false}
  }'),
  
  -- Comments - Restricted: HR Admin only (privacy concerns)
  ('Comments', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": false, "edit": false},
    "omc": {"view": false, "edit": false},
    "payroll": {"view": false, "edit": false},
    "toplux": {"view": false, "edit": false}
  }')
ON CONFLICT (column_name) 
WHERE is_masterdata = true 
DO NOTHING;

-- Create unique constraint to enforce idempotency
-- This ensures we can safely re-run this migration without duplicates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'column_config_masterdata_unique'
  ) THEN
    ALTER TABLE public.column_config 
    ADD CONSTRAINT column_config_masterdata_unique 
    UNIQUE (column_name, is_masterdata);
  END IF;
END $$;
