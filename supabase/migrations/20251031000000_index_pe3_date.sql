-- Migration: Index PE3 Date Column for Performance and Uniqueness
-- Created: 2025-10-31
-- Story: 6.2 - PE3 Date Unique Selection (Inventory Management)

-- Performance index for availability queries
-- This index speeds up the LEFT JOIN query in the available-pe3 API endpoint
CREATE INDEX IF NOT EXISTS idx_employees_pe3_date
ON employees(pe3_date)
WHERE pe3_date IS NOT NULL;

-- Unique constraint to prevent duplicate PE3 date assignments
-- Partial unique index only applies to non-archived employees
-- This prevents race conditions when multiple HR admins assign dates simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pe3_date
ON employees(pe3_date)
WHERE pe3_date IS NOT NULL AND is_archived = false;

-- Add comments for documentation
COMMENT ON INDEX idx_employees_pe3_date IS 'Index for PE3 date inventory management queries';
COMMENT ON INDEX idx_unique_pe3_date IS 'Prevents duplicate PE3 date assignments across active employees';
