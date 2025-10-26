-- Initial database schema for HR Masterdata Management System
-- Migration: 20250126000000_initial_schema.sql
-- Description: Create core tables (users, employees, column_config, important_dates)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (application users, links to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('hr_admin', 'sodexo', 'omc', 'payroll', 'toplux')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Employees table (masterdata)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_ssn ON public.employees(ssn);
CREATE INDEX IF NOT EXISTS idx_employees_surname ON public.employees(surname);
CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON public.employees(hire_date);
CREATE INDEX IF NOT EXISTS idx_employees_is_archived ON public.employees(is_archived);
CREATE INDEX IF NOT EXISTS idx_employees_is_terminated ON public.employees(is_terminated);
CREATE INDEX IF NOT EXISTS idx_employees_full_text ON public.employees USING GIN(
  to_tsvector('english', 
    COALESCE(first_name, '') || ' ' || 
    COALESCE(surname, '') || ' ' || 
    COALESCE(email, '') || ' ' || 
    COALESCE(mobile, '')
  )
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to employees table
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Column configurations table
CREATE TABLE IF NOT EXISTS public.column_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  column_name TEXT NOT NULL,
  column_type TEXT NOT NULL CHECK (column_type IN ('text', 'number', 'date', 'boolean')),
  role_permissions JSONB NOT NULL DEFAULT '{}',
  is_masterdata BOOLEAN NOT NULL DEFAULT false,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_column_config_masterdata ON public.column_config(is_masterdata);
CREATE INDEX IF NOT EXISTS idx_column_config_role_permissions ON public.column_config USING GIN(role_permissions);

-- Important dates table
CREATE TABLE IF NOT EXISTS public.important_dates (
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

CREATE INDEX IF NOT EXISTS idx_important_dates_week ON public.important_dates(week_number, year);
CREATE INDEX IF NOT EXISTS idx_important_dates_category ON public.important_dates(category);

-- Apply trigger to important_dates table
CREATE TRIGGER update_important_dates_updated_at
  BEFORE UPDATE ON public.important_dates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
