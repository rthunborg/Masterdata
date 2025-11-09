-- Migration: Add one_marked_at timestamp column to employees table
-- Story: 8.3 One Field Time-Based Status Logic
-- Purpose: Track when One field was set to true for 24-hour waiting period calculation

-- Add one_marked_at column
ALTER TABLE employees ADD COLUMN one_marked_at TIMESTAMPTZ;

-- Add column comment for documentation
COMMENT ON COLUMN employees.one_marked_at IS 'Timestamp when One field was set to true - used for 24-hour waiting period calculation before Talmundo field can be edited';

-- No index needed initially since queries will always filter by employee ID first
-- If performance issues arise with large datasets, consider adding partial index:
-- CREATE INDEX idx_employees_one_marked_at ON employees(one_marked_at) WHERE one_marked_at IS NOT NULL;
