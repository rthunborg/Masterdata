-- Row-Level Security Policies
-- Migration: 20250126000002_rls_policies.sql
-- Description: Enable RLS and create security policies for all tables

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
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE auth_user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

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
