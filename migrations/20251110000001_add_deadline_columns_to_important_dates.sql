-- Add deadline columns to important_dates table
-- Story 8.11: Important Dates Deadline Columns
-- Adds deadline_cancel and deadline_submit columns for enforcing submission and cancellation deadlines

-- Add columns
ALTER TABLE public.important_dates
ADD COLUMN deadline_submit DATE,
ADD COLUMN deadline_cancel DATE;

-- Add check constraints to enforce business rules
-- Rule 1: deadline_submit must be <= deadline_cancel (submit deadline comes first)
ALTER TABLE public.important_dates
ADD CONSTRAINT deadline_submit_before_cancel
CHECK (
  deadline_submit IS NULL OR 
  deadline_cancel IS NULL OR 
  deadline_submit <= deadline_cancel
);

-- Rule 2: deadline_cancel must be <= date_value (cancel deadline must be before event)
ALTER TABLE public.important_dates
ADD CONSTRAINT deadlines_before_date
CHECK (
  deadline_cancel IS NULL OR 
  deadline_cancel <= date_value::date
);

-- Add column comments for documentation
COMMENT ON COLUMN public.important_dates.deadline_submit IS 
  'Deadline for submitting new employee assignments. After this date, no new assignments allowed.';

COMMENT ON COLUMN public.important_dates.deadline_cancel IS 
  'Deadline for canceling employee assignments. After this date, no cancellations allowed.';

-- Verify columns and constraints were added successfully
DO $$
DECLARE
  col_count INTEGER;
  constraint_count INTEGER;
BEGIN
  -- Check columns exist
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'important_dates' 
    AND column_name IN ('deadline_submit', 'deadline_cancel');
  
  IF col_count != 2 THEN
    RAISE EXCEPTION 'Failed to add deadline columns';
  END IF;

  -- Check constraints exist
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.check_constraints
  WHERE constraint_schema = 'public'
    AND constraint_name IN ('deadline_submit_before_cancel', 'deadlines_before_date');
  
  IF constraint_count != 2 THEN
    RAISE EXCEPTION 'Failed to add deadline constraints';
  END IF;

  RAISE NOTICE 'Successfully added deadline_submit and deadline_cancel columns with constraints';
END $$;
