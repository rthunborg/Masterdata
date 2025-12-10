/*
  # Update RLS Policies for Recruiter and Crewing

  1. Employees:
     - Grant Recruiter full management access (same as HR Admin)
     - Grant Crewing read access to non-archived employees (same as other external parties)
  2. Important Dates:
     - Grant Recruiter management access (same as HR Admin)
*/

-- Employees Table Policies

-- Drop existing policies to redefine them cleanly
DROP POLICY IF EXISTS "HR Admin can manage employees" ON public.employees;
DROP POLICY IF EXISTS "External parties can view employees" ON public.employees;

-- Re-create "HR Admin and Recruiter can manage employees"
CREATE POLICY "HR Admin and Recruiter can manage employees" ON public.employees
  FOR ALL USING (get_user_role() IN ('hr_admin', 'recruiter'));

-- Re-create "External parties can view employees" including Crewing
CREATE POLICY "External parties can view employees" ON public.employees
  FOR SELECT USING (
    get_user_role() IN ('sodexo', 'omc', 'payroll', 'toplux', 'crewing') 
    AND is_archived = false
  );

-- Important Dates Table Policies

-- Drop existing policy
DROP POLICY IF EXISTS "HR Admin can manage important dates" ON public.important_dates;

-- Re-create "HR Admin and Recruiter can manage important dates"
CREATE POLICY "HR Admin and Recruiter can manage important dates" ON public.important_dates
  FOR ALL USING (get_user_role() IN ('hr_admin', 'recruiter'));

