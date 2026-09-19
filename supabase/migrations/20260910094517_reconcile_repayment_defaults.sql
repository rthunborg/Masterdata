-- Reconcile the documented staging representation, where both repayment
-- columns are already boolean but have no defaults. Existing values,
-- including intentional NULLs, are preserved.
BEGIN;

ALTER TABLE public.employees
  ALTER COLUMN repayment_needed_omc SET DEFAULT false,
  ALTER COLUMN repayment_needed_pe3 SET DEFAULT false;

COMMIT;
