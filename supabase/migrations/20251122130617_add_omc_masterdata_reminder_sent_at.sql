-- Migration: Add ÖMC Masterdata Reminder Notification Marker
-- Description: Adds timestamp column to track when reminder notification was sent for incomplete masterdata after ÖMC completion
-- Story: 14.1 - ÖMC + Masterdata Completion Follow-up
-- Created: 2025-11-22

-- Add omc_masterdata_reminder_sent_at timestamp column to employees table
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS omc_masterdata_reminder_sent_at TIMESTAMPTZ;

-- Add column comment for documentation
COMMENT ON COLUMN public.employees.omc_masterdata_reminder_sent_at IS 
  'Timestamp when reminder notification was sent for incomplete masterdata after ÖMC completion. NULL if notification not yet sent.';

-- Add index for query performance (used in scheduled job queries)
CREATE INDEX IF NOT EXISTS idx_employees_omc_masterdata_reminder_sent_at 
  ON public.employees(omc_masterdata_reminder_sent_at);

-- Verify column added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'employees'
  AND column_name = 'omc_masterdata_reminder_sent_at';

