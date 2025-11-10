-- Migration: Add time_value column to important_dates table
-- Description: Adds TIME column for PE3 appointment times (HH:MM format, 24-hour clock)
-- Created: 2025-11-10
-- Story: 8.10 PE3 Date Time Selection

-- Add time_value column to important_dates table
ALTER TABLE public.important_dates 
  ADD COLUMN time_value TIME;

-- Add column comment for documentation
COMMENT ON COLUMN public.important_dates.time_value IS 
  'Time of day for PE3 appointments (HH:MM format, 24-hour clock). Only used for PE3 category dates.';

-- Verify column added (for manual testing)
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'important_dates' AND column_name = 'time_value';
