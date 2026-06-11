-- Add repayment marker columns expected by the subsequent boolean conversion
-- migration. They were originally date-like markers; the next migration
-- converts non-null values to boolean flags.
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS repayment_needed_omc DATE,
ADD COLUMN IF NOT EXISTS repayment_needed_pe3 DATE;

COMMENT ON COLUMN public.employees.repayment_needed_omc IS
  'Legacy marker for OMC repayment follow-up before boolean conversion.';

COMMENT ON COLUMN public.employees.repayment_needed_pe3 IS
  'Legacy marker for PE3 repayment follow-up before boolean conversion.';
