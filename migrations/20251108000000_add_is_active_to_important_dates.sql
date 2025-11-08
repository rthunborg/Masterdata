-- Migration: Add is_active column to important_dates
-- Description: Adds is_active boolean column to enable archiving important dates
-- Created: 2025-11-08

-- Add is_active column (default to true for existing records)
ALTER TABLE public.important_dates
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Create index for filtering active/archived dates
CREATE INDEX IF NOT EXISTS idx_important_dates_is_active ON public.important_dates(is_active);

-- Add comment for documentation
COMMENT ON COLUMN public.important_dates.is_active IS 'Indicates if the important date is active (true) or archived (false). Archived dates are not shown in date selection dropdowns.';
