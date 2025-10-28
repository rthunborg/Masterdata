-- Migration: Initial Database Schema
-- Description: Creates core tables for HR Masterdata Management System
-- Created: 2025-10-27
-- Tables: users, employees, column_config, sodexo_data, omc_data, payroll_data, toplux_data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create update_updated_at_column function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create get_user_role function for RLS policies
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get the role from the current user's record in public.users table
  SELECT role INTO user_role
  FROM public.users
  WHERE auth_user_id = auth.uid();
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-----------------------------------
-- Users Table
-----------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('hr_admin', 'sodexo', 'omc', 'payroll', 'toplux')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own record
CREATE POLICY "Users can read their own record" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid());

-- RLS Policy: HR Admin can read all users
CREATE POLICY "HR Admin can read all users" ON public.users
  FOR SELECT USING (get_user_role() = 'hr_admin');

-----------------------------------
-- Employees Table
-----------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
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

CREATE INDEX IF NOT EXISTS idx_employees_ssn ON public.employees(ssn);
CREATE INDEX IF NOT EXISTS idx_employees_surname ON public.employees(surname);
CREATE INDEX IF NOT EXISTS idx_employees_is_archived ON public.employees(is_archived);
CREATE INDEX IF NOT EXISTS idx_employees_is_terminated ON public.employees(is_terminated);

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on employees table
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS Policy: HR Admin has full access to employees
CREATE POLICY "HR Admin can manage employees" ON public.employees
  FOR ALL USING (get_user_role() = 'hr_admin');

-- RLS Policy: External parties can view non-archived employees
CREATE POLICY "External parties can view employees" ON public.employees
  FOR SELECT USING (
    get_user_role() IN ('sodexo', 'omc', 'payroll', 'toplux') 
    AND is_archived = false
  );

-----------------------------------
-- Column Configuration Table
-----------------------------------
CREATE TABLE IF NOT EXISTS public.column_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  column_name TEXT NOT NULL,
  column_type TEXT NOT NULL CHECK (column_type IN ('text', 'number', 'date', 'boolean')),
  role_permissions JSONB NOT NULL DEFAULT '{}',
  is_masterdata BOOLEAN NOT NULL DEFAULT false,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_column_config_is_masterdata ON public.column_config(is_masterdata);
CREATE INDEX IF NOT EXISTS idx_column_config_role_permissions ON public.column_config USING GIN(role_permissions);

-- Enable RLS on column_config table
ALTER TABLE public.column_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can read column configurations
CREATE POLICY "Everyone can read column configs" ON public.column_config
  FOR SELECT USING (true);

-- RLS Policy: HR Admin can manage masterdata columns
CREATE POLICY "HR Admin can manage masterdata columns" ON public.column_config
  FOR ALL USING (get_user_role() = 'hr_admin' AND is_masterdata = true);

-- RLS Policy: External parties can manage their own custom columns
CREATE POLICY "External parties can manage custom columns" ON public.column_config
  FOR ALL USING (
    get_user_role() IN ('sodexo', 'omc', 'payroll', 'toplux')
    AND is_masterdata = false
    AND role_permissions ? get_user_role()
  );

-----------------------------------
-- Sodexo Data Table
-----------------------------------
CREATE TABLE IF NOT EXISTS public.sodexo_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_sodexo_data_employee ON public.sodexo_data(employee_id);
CREATE INDEX IF NOT EXISTS idx_sodexo_data_jsonb ON public.sodexo_data USING GIN(data);

CREATE TRIGGER update_sodexo_data_updated_at
  BEFORE UPDATE ON public.sodexo_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on sodexo_data table
ALTER TABLE public.sodexo_data ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Sodexo can manage their own data
CREATE POLICY "Sodexo can manage their own data" ON public.sodexo_data
  FOR ALL USING (get_user_role() = 'sodexo');

-- RLS Policy: HR Admin can view sodexo data
CREATE POLICY "HR Admin can view sodexo data" ON public.sodexo_data
  FOR SELECT USING (get_user_role() = 'hr_admin');

-----------------------------------
-- ÖMC Data Table
-----------------------------------
CREATE TABLE IF NOT EXISTS public.omc_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_omc_data_employee ON public.omc_data(employee_id);
CREATE INDEX IF NOT EXISTS idx_omc_data_jsonb ON public.omc_data USING GIN(data);

CREATE TRIGGER update_omc_data_updated_at
  BEFORE UPDATE ON public.omc_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on omc_data table
ALTER TABLE public.omc_data ENABLE ROW LEVEL SECURITY;

-- RLS Policy: ÖMC can manage their own data
CREATE POLICY "OMC can manage their own data" ON public.omc_data
  FOR ALL USING (get_user_role() = 'omc');

-- RLS Policy: HR Admin can view omc data
CREATE POLICY "HR Admin can view omc data" ON public.omc_data
  FOR SELECT USING (get_user_role() = 'hr_admin');

-----------------------------------
-- Payroll Data Table
-----------------------------------
CREATE TABLE IF NOT EXISTS public.payroll_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_data_employee ON public.payroll_data(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_data_jsonb ON public.payroll_data USING GIN(data);

CREATE TRIGGER update_payroll_data_updated_at
  BEFORE UPDATE ON public.payroll_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on payroll_data table
ALTER TABLE public.payroll_data ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Payroll can manage their own data
CREATE POLICY "Payroll can manage their own data" ON public.payroll_data
  FOR ALL USING (get_user_role() = 'payroll');

-- RLS Policy: HR Admin can view payroll data
CREATE POLICY "HR Admin can view payroll data" ON public.payroll_data
  FOR SELECT USING (get_user_role() = 'hr_admin');

-----------------------------------
-- Toplux Data Table
-----------------------------------
CREATE TABLE IF NOT EXISTS public.toplux_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_toplux_data_employee ON public.toplux_data(employee_id);
CREATE INDEX IF NOT EXISTS idx_toplux_data_jsonb ON public.toplux_data USING GIN(data);

CREATE TRIGGER update_toplux_data_updated_at
  BEFORE UPDATE ON public.toplux_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on toplux_data table
ALTER TABLE public.toplux_data ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Toplux can manage their own data
CREATE POLICY "Toplux can manage their own data" ON public.toplux_data
  FOR ALL USING (get_user_role() = 'toplux');

-- RLS Policy: HR Admin can view toplux data
CREATE POLICY "HR Admin can view toplux data" ON public.toplux_data
  FOR SELECT USING (get_user_role() = 'hr_admin');
