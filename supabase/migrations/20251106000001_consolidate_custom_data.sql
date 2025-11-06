-- Migration: Consolidate Custom Column Data
-- Description: Consolidates custom column data from party-specific tables into employees.custom_data JSONB column
-- Created: 2025-11-06
-- Purpose: Simplifies architecture by eliminating 4 separate party tables and complex multi-table queries
-- Impact: Removes sodexo_data, omc_data, payroll_data, toplux_data tables

BEGIN;

-----------------------------------
-- Step 1: Add custom_data column to employees table
-----------------------------------
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.employees.custom_data IS 
  'Consolidated custom column data from all external parties (Sodexo, OMC, Payroll, Toplux)';

-----------------------------------
-- Step 2: Migrate data from sodexo_data (first pass)
-----------------------------------
UPDATE public.employees e
SET custom_data = COALESCE(s.data, '{}'::jsonb)
FROM public.sodexo_data s
WHERE e.id = s.employee_id;

-----------------------------------
-- Step 3: Migrate data from omc_data (merge with existing)
-----------------------------------
UPDATE public.employees e
SET custom_data = e.custom_data || COALESCE(o.data, '{}'::jsonb)
FROM public.omc_data o
WHERE e.id = o.employee_id;

-----------------------------------
-- Step 4: Migrate data from payroll_data (merge with existing)
-----------------------------------
UPDATE public.employees e
SET custom_data = e.custom_data || COALESCE(p.data, '{}'::jsonb)
FROM public.payroll_data p
WHERE e.id = p.employee_id;

-----------------------------------
-- Step 5: Migrate data from toplux_data (merge with existing)
-----------------------------------
UPDATE public.employees e
SET custom_data = e.custom_data || COALESCE(t.data, '{}'::jsonb)
FROM public.toplux_data t
WHERE e.id = t.employee_id;

-----------------------------------
-- Step 6: Create GIN index for efficient JSONB queries
-----------------------------------
CREATE INDEX IF NOT EXISTS idx_employees_custom_data_gin 
ON public.employees USING GIN (custom_data);

COMMENT ON INDEX idx_employees_custom_data_gin IS 
  'GIN index for fast JSONB key lookups in custom_data column';

-----------------------------------
-- Step 7: Verify data migration integrity
-----------------------------------
-- This will output counts for manual verification
DO $$
DECLARE
  sodexo_count INTEGER;
  omc_count INTEGER;
  payroll_count INTEGER;
  toplux_count INTEGER;
  employees_with_custom_data INTEGER;
BEGIN
  SELECT COUNT(*) INTO sodexo_count FROM public.sodexo_data;
  SELECT COUNT(*) INTO omc_count FROM public.omc_data;
  SELECT COUNT(*) INTO payroll_count FROM public.payroll_data;
  SELECT COUNT(*) INTO toplux_count FROM public.toplux_data;
  SELECT COUNT(*) INTO employees_with_custom_data 
  FROM public.employees 
  WHERE custom_data != '{}'::jsonb;

  RAISE NOTICE 'Data Migration Verification:';
  RAISE NOTICE '  Sodexo records: %', sodexo_count;
  RAISE NOTICE '  OMC records: %', omc_count;
  RAISE NOTICE '  Payroll records: %', payroll_count;
  RAISE NOTICE '  Toplux records: %', toplux_count;
  RAISE NOTICE '  Employees with custom data: %', employees_with_custom_data;
  
  -- Log if there's a significant mismatch (could indicate data loss)
  IF employees_with_custom_data < (sodexo_count + omc_count + payroll_count + toplux_count) / 2 THEN
    RAISE WARNING 'Custom data count lower than expected - verify migration manually';
  END IF;
END $$;

-----------------------------------
-- Step 8: Drop old RLS policies on party tables
-----------------------------------
-- Drop policies from 20251106000000_allow_hr_admin_edit_party_data.sql
DROP POLICY IF EXISTS "HR Admin can update sodexo data" ON public.sodexo_data;
DROP POLICY IF EXISTS "HR Admin can insert sodexo data" ON public.sodexo_data;
DROP POLICY IF EXISTS "Sodexo can read own data" ON public.sodexo_data;
DROP POLICY IF EXISTS "Sodexo can manage own data" ON public.sodexo_data;

DROP POLICY IF EXISTS "HR Admin can update omc data" ON public.omc_data;
DROP POLICY IF EXISTS "HR Admin can insert omc data" ON public.omc_data;
DROP POLICY IF EXISTS "OMC can read own data" ON public.omc_data;
DROP POLICY IF EXISTS "OMC can manage own data" ON public.omc_data;

DROP POLICY IF EXISTS "HR Admin can update payroll data" ON public.payroll_data;
DROP POLICY IF EXISTS "HR Admin can insert payroll data" ON public.payroll_data;
DROP POLICY IF EXISTS "Payroll can read own data" ON public.payroll_data;
DROP POLICY IF EXISTS "Payroll can manage own data" ON public.payroll_data;

DROP POLICY IF EXISTS "HR Admin can update toplux data" ON public.toplux_data;
DROP POLICY IF EXISTS "HR Admin can insert toplux data" ON public.toplux_data;
DROP POLICY IF EXISTS "Toplux can read own data" ON public.toplux_data;
DROP POLICY IF EXISTS "Toplux can manage own data" ON public.toplux_data;

-----------------------------------
-- Step 9: Drop old party data tables
-----------------------------------
-- Drop indexes first
DROP INDEX IF EXISTS public.idx_sodexo_data_employee_id;
DROP INDEX IF EXISTS public.idx_omc_data_employee_id;
DROP INDEX IF EXISTS public.idx_payroll_data_employee_id;
DROP INDEX IF EXISTS public.idx_toplux_data_employee_id;

-- Drop triggers
DROP TRIGGER IF EXISTS update_sodexo_data_updated_at ON public.sodexo_data;
DROP TRIGGER IF EXISTS update_omc_data_updated_at ON public.omc_data;
DROP TRIGGER IF EXISTS update_payroll_data_updated_at ON public.payroll_data;
DROP TRIGGER IF EXISTS update_toplux_data_updated_at ON public.toplux_data;

-- Drop tables (CASCADE to remove any remaining dependencies)
DROP TABLE IF EXISTS public.sodexo_data CASCADE;
DROP TABLE IF EXISTS public.omc_data CASCADE;
DROP TABLE IF EXISTS public.payroll_data CASCADE;
DROP TABLE IF EXISTS public.toplux_data CASCADE;

RAISE NOTICE 'Migration complete: Custom data consolidated into employees.custom_data';
RAISE NOTICE 'Party-specific tables (sodexo_data, omc_data, payroll_data, toplux_data) dropped';

COMMIT;