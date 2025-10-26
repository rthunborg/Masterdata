# Database Schema

## PostgreSQL Database Design

The database schema is designed for scalability (10,000+ employees), performance (sub-2-second queries), and security (row-level security enforcement). We use standard relational tables for masterdata with JSONB columns for flexible custom data.

### Schema SQL (Supabase Migration)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (application users, links to Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('hr_admin', 'sodexo', 'omc', 'payroll', 'toplux')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- Employees table (masterdata)
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  surname TEXT NOT NULL,
  ssn TEXT UNIQUE NOT NULL,
  email TEXT,
  mobile TEXT,
  rank TEXT,
  gender TEXT,
  town_district TEXT,
  hire_date DATE NOT NULL,
  termination_date DATE,
  termination_reason TEXT,
  is_terminated BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_employees_ssn ON public.employees(ssn);
CREATE INDEX idx_employees_surname ON public.employees(surname);
CREATE INDEX idx_employees_hire_date ON public.employees(hire_date);
CREATE INDEX idx_employees_is_archived ON public.employees(is_archived);
CREATE INDEX idx_employees_is_terminated ON public.employees(is_terminated);
CREATE INDEX idx_employees_full_text ON public.employees USING GIN(
  to_tsvector('english', 
    COALESCE(first_name, '') || ' ' || 
    COALESCE(surname, '') || ' ' || 
    COALESCE(email, '') || ' ' || 
    COALESCE(mobile, '')
  )
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS utf8
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
utf8 LANGUAGE plpgsql;

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Column configurations table
CREATE TABLE public.column_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  column_name TEXT NOT NULL,
  column_type TEXT NOT NULL CHECK (column_type IN ('text', 'number', 'date', 'boolean')),
  role_permissions JSONB NOT NULL DEFAULT '{}',
  is_masterdata BOOLEAN NOT NULL DEFAULT false,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_column_config_masterdata ON public.column_config(is_masterdata);
CREATE INDEX idx_column_config_role_permissions ON public.column_config USING GIN(role_permissions);

-- Important dates table
CREATE TABLE public.important_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_number INTEGER,
  year INTEGER NOT NULL,
  category TEXT NOT NULL,
  date_description TEXT NOT NULL,
  date_value TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_important_dates_week ON public.important_dates(week_number, year);
CREATE INDEX idx_important_dates_category ON public.important_dates(category);

CREATE TRIGGER update_important_dates_updated_at
  BEFORE UPDATE ON public.important_dates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- External party custom data tables (one per party)
CREATE TABLE public.sodexo_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX idx_sodexo_data_employee ON public.sodexo_data(employee_id);
CREATE INDEX idx_sodexo_data_jsonb ON public.sodexo_data USING GIN(data);

CREATE TRIGGER update_sodexo_data_updated_at
  BEFORE UPDATE ON public.sodexo_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Repeat for other parties
CREATE TABLE public.omc_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX idx_omc_data_employee ON public.omc_data(employee_id);
CREATE INDEX idx_omc_data_jsonb ON public.omc_data USING GIN(data);

CREATE TRIGGER update_omc_data_updated_at
  BEFORE UPDATE ON public.omc_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.payroll_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX idx_payroll_data_employee ON public.payroll_data(employee_id);
CREATE INDEX idx_payroll_data_jsonb ON public.payroll_data USING GIN(data);

CREATE TRIGGER update_payroll_data_updated_at
  BEFORE UPDATE ON public.payroll_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.toplux_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX idx_toplux_data_employee ON public.toplux_data(employee_id);
CREATE INDEX idx_toplux_data_jsonb ON public.toplux_data USING GIN(data);

CREATE TRIGGER update_toplux_data_updated_at
  BEFORE UPDATE ON public.toplux_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Row-Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.column_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.important_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sodexo_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omc_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toplux_data ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS utf8
  SELECT role FROM public.users WHERE auth_user_id = auth.uid();
utf8 LANGUAGE SQL SECURITY DEFINER;

-- Users table policies
CREATE POLICY "Users can view their own record" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "HR Admin can view all users" ON public.users
  FOR SELECT USING (get_user_role() = 'hr_admin');

CREATE POLICY "HR Admin can insert users" ON public.users
  FOR INSERT WITH CHECK (get_user_role() = 'hr_admin');

CREATE POLICY "HR Admin can update users" ON public.users
  FOR UPDATE USING (get_user_role() = 'hr_admin');

-- Employees table policies
CREATE POLICY "HR Admin can do anything with employees" ON public.employees
  FOR ALL USING (get_user_role() = 'hr_admin');

CREATE POLICY "External parties can view active employees" ON public.employees
  FOR SELECT USING (
    is_archived = false AND 
    (get_user_role() IN ('sodexo', 'omc', 'payroll', 'toplux'))
  );

-- Column config policies
CREATE POLICY "Anyone can read column config" ON public.column_config
  FOR SELECT USING (true);

CREATE POLICY "HR Admin can manage column config" ON public.column_config
  FOR ALL USING (get_user_role() = 'hr_admin');

CREATE POLICY "External parties can create their custom columns" ON public.column_config
  FOR INSERT WITH CHECK (
    is_masterdata = false AND
    get_user_role() IN ('sodexo', 'omc', 'payroll', 'toplux')
  );

-- Important dates policies
CREATE POLICY "Everyone can read important dates" ON public.important_dates
  FOR SELECT USING (true);

CREATE POLICY "HR Admin can manage important dates" ON public.important_dates
  FOR ALL USING (get_user_role() = 'hr_admin');

-- Sodexo data policies
CREATE POLICY "Sodexo can manage their own data" ON public.sodexo_data
  FOR ALL USING (get_user_role() = 'sodexo');

CREATE POLICY "HR Admin can view sodexo data" ON public.sodexo_data
  FOR SELECT USING (get_user_role() = 'hr_admin');

-- ÖMC data policies
CREATE POLICY "ÖMC can manage their own data" ON public.omc_data
  FOR ALL USING (get_user_role() = 'omc');

CREATE POLICY "HR Admin can view omc data" ON public.omc_data
  FOR SELECT USING (get_user_role() = 'hr_admin');

-- Payroll data policies
CREATE POLICY "Payroll can manage their own data" ON public.payroll_data
  FOR ALL USING (get_user_role() = 'payroll');

CREATE POLICY "HR Admin can view payroll data" ON public.payroll_data
  FOR SELECT USING (get_user_role() = 'hr_admin');

-- Toplux data policies
CREATE POLICY "Toplux can manage their own data" ON public.toplux_data
  FOR ALL USING (get_user_role() = 'toplux');

CREATE POLICY "HR Admin can view toplux data" ON public.toplux_data
  FOR SELECT USING (get_user_role() = 'hr_admin');
```

### Seed Data for Column Configurations

```sql
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
  }');
```

---
