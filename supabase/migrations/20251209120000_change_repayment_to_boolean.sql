-- Change repayment columns from DATE to BOOLEAN
BEGIN;

-- 1. Drop existing columns (since we can't easily convert DATE to BOOLEAN with data preservation logic that makes sense universally, 
-- and the previous implementation was copying date strings. We'll assume a fresh start or simple boolean flag is desired).
-- If data preservation was critical, we'd check if value IS NOT NULL -> TRUE.

-- Safe transition: Add temporary columns, migrate data, drop old, rename new.

ALTER TABLE employees ADD COLUMN repayment_needed_omc_new BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN repayment_needed_pe3_new BOOLEAN DEFAULT FALSE;

-- Migrate data: if date was set (not null), set boolean to true
UPDATE employees 
SET repayment_needed_omc_new = (repayment_needed_omc IS NOT NULL),
    repayment_needed_pe3_new = (repayment_needed_pe3 IS NOT NULL);

-- Drop old columns
ALTER TABLE employees DROP COLUMN repayment_needed_omc;
ALTER TABLE employees DROP COLUMN repayment_needed_pe3;

-- Rename new columns
ALTER TABLE employees RENAME COLUMN repayment_needed_omc_new TO repayment_needed_omc;
ALTER TABLE employees RENAME COLUMN repayment_needed_pe3_new TO repayment_needed_pe3;

-- Re-add comments
COMMENT ON COLUMN employees.repayment_needed_omc IS 'Flag indicating if ÖMC repayment is needed after termination. Auto-managed by termination workflow.';
COMMENT ON COLUMN employees.repayment_needed_pe3 IS 'Flag indicating if PE3 repayment is needed after termination. Auto-managed by termination workflow.';

-- Re-create indexes
CREATE INDEX idx_employees_repayment_omc ON employees(repayment_needed_omc) WHERE repayment_needed_omc = TRUE;
CREATE INDEX idx_employees_repayment_pe3 ON employees(repayment_needed_pe3) WHERE repayment_needed_pe3 = TRUE;

-- Update column_config to reflect new type (boolean)
UPDATE column_config 
SET column_type = 'boolean'
WHERE db_column_name IN ('repayment_needed_omc', 'repayment_needed_pe3');

COMMIT;

