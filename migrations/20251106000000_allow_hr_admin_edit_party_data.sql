-- Migration: Allow HR Admin to edit party data tables
-- Description: Adds UPDATE and INSERT policies for HR Admin role on all party data tables
-- Context: HR Admin previously could only view (SELECT) party data. They need to be able
--          to edit custom column data for all parties.
-- Date: 2025-11-06

-- =========================================
-- Sodexo Data Table - Add HR Admin UPDATE/INSERT policies
-- =========================================

-- RLS Policy: HR Admin can update sodexo data
CREATE POLICY "HR Admin can update sodexo data" ON public.sodexo_data
  FOR UPDATE
  USING (get_user_role() = 'hr_admin')
  WITH CHECK (get_user_role() = 'hr_admin');

-- RLS Policy: HR Admin can insert sodexo data
CREATE POLICY "HR Admin can insert sodexo data" ON public.sodexo_data
  FOR INSERT
  WITH CHECK (get_user_role() = 'hr_admin');

COMMENT ON POLICY "HR Admin can update sodexo data" ON public.sodexo_data IS
  'Allows HR Admin to update custom column data in sodexo_data table';

COMMENT ON POLICY "HR Admin can insert sodexo data" ON public.sodexo_data IS
  'Allows HR Admin to create custom column data records in sodexo_data table';

-- =========================================
-- OMC Data Table - Add HR Admin UPDATE/INSERT policies
-- =========================================

-- RLS Policy: HR Admin can update omc data
CREATE POLICY "HR Admin can update omc data" ON public.omc_data
  FOR UPDATE
  USING (get_user_role() = 'hr_admin')
  WITH CHECK (get_user_role() = 'hr_admin');

-- RLS Policy: HR Admin can insert omc data
CREATE POLICY "HR Admin can insert omc data" ON public.omc_data
  FOR INSERT
  WITH CHECK (get_user_role() = 'hr_admin');

COMMENT ON POLICY "HR Admin can update omc data" ON public.omc_data IS
  'Allows HR Admin to update custom column data in omc_data table';

COMMENT ON POLICY "HR Admin can insert omc data" ON public.omc_data IS
  'Allows HR Admin to create custom column data records in omc_data table';

-- =========================================
-- Payroll Data Table - Add HR Admin UPDATE/INSERT policies
-- =========================================

-- RLS Policy: HR Admin can update payroll data
CREATE POLICY "HR Admin can update payroll data" ON public.payroll_data
  FOR UPDATE
  USING (get_user_role() = 'hr_admin')
  WITH CHECK (get_user_role() = 'hr_admin');

-- RLS Policy: HR Admin can insert payroll data
CREATE POLICY "HR Admin can insert payroll data" ON public.payroll_data
  FOR INSERT
  WITH CHECK (get_user_role() = 'hr_admin');

COMMENT ON POLICY "HR Admin can update payroll data" ON public.payroll_data IS
  'Allows HR Admin to update custom column data in payroll_data table';

COMMENT ON POLICY "HR Admin can insert payroll data" ON public.payroll_data IS
  'Allows HR Admin to create custom column data records in payroll_data table';

-- =========================================
-- Toplux Data Table - Add HR Admin UPDATE/INSERT policies
-- =========================================

-- RLS Policy: HR Admin can update toplux data
CREATE POLICY "HR Admin can update toplux data" ON public.toplux_data
  FOR UPDATE
  USING (get_user_role() = 'hr_admin')
  WITH CHECK (get_user_role() = 'hr_admin');

-- RLS Policy: HR Admin can insert toplux data
CREATE POLICY "HR Admin can insert toplux data" ON public.toplux_data
  FOR INSERT
  WITH CHECK (get_user_role() = 'hr_admin');

COMMENT ON POLICY "HR Admin can update toplux data" ON public.toplux_data IS
  'Allows HR Admin to update custom column data in toplux_data table';

COMMENT ON POLICY "HR Admin can insert toplux data" ON public.toplux_data IS
  'Allows HR Admin to create custom column data records in toplux_data table';
