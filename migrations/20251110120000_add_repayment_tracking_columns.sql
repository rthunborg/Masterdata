BEGIN;

-- Add repayment columns to employees table
ALTER TABLE employees
ADD COLUMN repayment_needed_omc DATE,
ADD COLUMN repayment_needed_pe3 DATE;

-- Add descriptive comments
COMMENT ON COLUMN employees.repayment_needed_omc IS 'ÖMC date requiring repayment after termination. Auto-managed by termination workflow.';
COMMENT ON COLUMN employees.repayment_needed_pe3 IS 'PE3 date requiring repayment after termination. Auto-managed by termination workflow.';

-- Add indexes for filtering queries (partial indexes for efficiency)
CREATE INDEX idx_employees_repayment_omc ON employees(repayment_needed_omc) WHERE repayment_needed_omc IS NOT NULL;
CREATE INDEX idx_employees_repayment_pe3 ON employees(repayment_needed_pe3) WHERE repayment_needed_pe3 IS NOT NULL;

-- Add to column_config for HR Admin visibility control
INSERT INTO column_config (db_column_name, column_type, is_masterdata, role_permissions, display_order, created_at, column_name)
VALUES
(
  'repayment_needed_omc',
  'date',
  true,
  '{"hr_admin": {"view": true, "edit": false}}'::jsonb,
  100,
  NOW(),
  'Återbetalningsskyldig ÖMC'
),
(
  'repayment_needed_pe3',
  'date',
  true,
  '{"hr_admin": {"view": true, "edit": false}}'::jsonb,
  101,
  NOW(),
  'Återbetalningsskyldig PE3'
);

COMMIT;