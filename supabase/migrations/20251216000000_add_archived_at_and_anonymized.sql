-- Add archived_at and is_anonymized columns to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN DEFAULT FALSE;

-- Index on archived_at for faster queries by the cron job
CREATE INDEX IF NOT EXISTS idx_employees_archived_at ON employees(archived_at);

-- Update RLS policies to ensure archived employees are accessible to appropriate roles if needed
-- Existing policies likely cover "all rows" for authenticated users or specific roles,
-- but we should ensure is_anonymized doesn't break anything.
-- Assuming standard select policies exist, no change needed for RLS unless we want to hide them specifically at DB level.
-- Filtering will be done on application level as requested.
