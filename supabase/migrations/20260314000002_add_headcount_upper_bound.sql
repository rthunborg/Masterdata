BEGIN;

-- Add upper bound constraint to prevent absurd headcount values
ALTER TABLE staffing_needs
  DROP CONSTRAINT IF EXISTS staffing_needs_headcount_need_check,
  ADD CONSTRAINT staffing_needs_headcount_need_check CHECK (headcount_need >= 0 AND headcount_need <= 9999);

COMMIT;
